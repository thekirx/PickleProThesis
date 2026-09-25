"""Identity association checks; remembered tracks must not become observations."""

from picklepro.detection import associate_boxes


def test_brief_nonoverlapping_motion_keeps_track_id():
    old = {4: [20, 20, 50, 100]}
    assert associate_boxes([[55, 20, 85, 100]], old, {4: 1}) == [4]


def test_one_old_track_cannot_be_assigned_to_two_detections():
    old = {4: [20, 20, 50, 100]}
    matches = associate_boxes([[21, 20, 51, 100], [35, 20, 65, 100]], old, {4: 0})
    assert matches.count(4) == 1


def test_distant_blob_gets_no_old_identity():
    assert associate_boxes([[500, 20, 530, 100]], {4: [20, 20, 50, 100]}, {4: 0}) == [None]
